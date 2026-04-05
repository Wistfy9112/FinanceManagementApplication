using FinanceManagementApplication.Domain.Entities;
using FinancialManagementApplication.Application.DTOs.User;
using FinancialManagementApplication.Application.Interface.Repositories;
using FinancialManagementApplication.Domain.Entities;
using FinancialManagementApplication.Infrastructure.Repositories;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

namespace FinancialManagementApplication.API.Controller
{
    [ApiController]
    [Route("api/user")]
    public class UserController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        public UserController(IUserRepository userRepository) {
            _userRepository = userRepository;
        }

        // GET api/user{id}
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<UserDTO>> GetUserByID(Guid id) {
            var user = await _userRepository.GetUserByIdAsync(id);
            if (user == null) {
                return NotFound();
            }
            return Ok(user);
        }

        // GET api/user//account/{accountID}
        [HttpGet("account/{accountID:guid}")]
        public async Task<ActionResult<UserDTO>> GetUserByAccount(Account account) {
            var user = await _userRepository.GetUserByAccountAsync(account);
            if (user == null) {
                return NotFound();
            }
            return Ok(user);
        }

        // POST api/user
        [HttpPost]
        public async Task<ActionResult<UserDTO>> CreateUser(User user) {
            var result = _userRepository.CreateUserAsync(user);
            return CreatedAtAction(nameof(GetUserByID), new { id = result.Id });
        }
        public async Task<ActionResult<UserDTO>> UpdateUser(Guid id, User user) {
            var currentUser = await _userRepository.GetUserByIdAsync(id);
            if (currentUser == null)
            {
                return NotFound();
            }

            currentUser.FirstName = user.FirstName;
            currentUser.LastName = user.LastName;   
            currentUser.PhoneNumber = user.PhoneNumber;
            currentUser.DateOfBirth = user.DateOfBirth;
            currentUser.UpdateAt = DateTime.UtcNow;

            var updated = await _userRepository.UpdateUserAsync(currentUser);
            return Ok(updated);
        }
        public async Task<IActionResult> DeleteUser(Guid id) {
            var currentUser = await _userRepository.GetUserByIdAsync(id);
            if (currentUser == null)
            {
                return NotFound();
            }
            await _userRepository.DeleteUserAsync(id);
            return NoContent();
        }

    }
}
